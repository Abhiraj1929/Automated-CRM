const cron = require("node-cron");
const { supabase } = require("../config/supabase");
const { runEscalations } = require("./escalationService");
const { rescoreAllLeads, applyScoreDecay } = require("./scoringService");
const { logger } = require("../middleware/logger");

let scheduledTasks = {};
let isInitialized = false;

// ============================================================
// Job Execution Registry
// ============================================================
const jobExecutors = {
  escalation: async () => {
    logger.info("Running scheduled escalation job");
    return await runEscalations();
  },
  scoring: async () => {
    logger.info("Running scheduled scoring job");
    return await rescoreAllLeads();
  },
  score_decay: async () => {
    logger.info("Running scheduled score decay job");
    return await applyScoreDecay();
  },
  cleanup: async (config) => {
    logger.info("Running scheduled cleanup job");
    const daysOld = config?.days_old || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const { count } = await supabase
      .from("notifications")
      .delete()
      .lt("created_at", cutoff.toISOString())
      .eq("is_read", true);
    return { cleaned: count || 0 };
  },
  notification: async () => {
    logger.info("Running scheduled notification job");
    return { notified: true };
  },
};

// ============================================================
// Convert interval_minutes to cron expression
// ============================================================
function intervalToCron(minutes) {
  if (minutes < 60) return `*/${minutes} * * * *`;
  if (minutes < 1440) return `0 */${Math.floor(minutes / 60)} * * *`;
  return `0 0 */${Math.floor(minutes / 1440)} * *`;
}

// ============================================================
// Start a single job on a cron schedule
// ============================================================
function startJob(job) {
  if (!job.is_active || scheduledTasks[job.id]) return;

  const cronExpr = job.cron_expression || intervalToCron(job.interval_minutes || 60);

  if (!cron.validate(cronExpr)) {
    logger.warn(`Invalid cron expression for job ${job.id}: ${cronExpr}`);
    return;
  }

  scheduledTasks[job.id] = cron.schedule(cronExpr, async () => {
    try {
      const executor = jobExecutors[job.job_type];
      if (!executor) {
        logger.warn(`Unknown job type: ${job.job_type}`);
        return;
      }

      const result = await executor(job.config || {});
      const now = new Date().toISOString();

      // Update job timing
      await supabase
        .from("scheduled_jobs")
        .update({ last_run_at: now })
        .eq("id", job.id);

      logger.info(`Scheduled job "${job.name}" completed`, { result });
    } catch (err) {
      logger.error(`Scheduled job "${job.name}" failed:`, { error: err.message });
    }
  });

  logger.info(`Started scheduled job "${job.name}" (${job.job_type}) with cron: ${cronExpr}`);
}

// ============================================================
// Stop a single job
// ============================================================
function stopJob(jobId) {
  if (scheduledTasks[jobId]) {
    scheduledTasks[jobId].stop();
    delete scheduledTasks[jobId];
    logger.info(`Stopped scheduled job: ${jobId}`);
  }
}

// ============================================================
// Initialize — load all active jobs from DB and start them
// ============================================================
async function initializeScheduler() {
  if (isInitialized) return;

  try {
    const { data: jobs, error } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    logger.info(`Initializing scheduler with ${jobs?.length || 0} active jobs`);

    for (const job of jobs || []) {
      startJob(job);
    }

    isInitialized = true;
    logger.info("Scheduler initialized successfully");
  } catch (err) {
    logger.error("Failed to initialize scheduler:", { error: err.message });
  }
}

// ============================================================
// Reload scheduler (after job create/update/delete)
// ============================================================
async function reloadScheduler() {
  // Stop all existing tasks
  for (const jobId of Object.keys(scheduledTasks)) {
    stopJob(jobId);
  }
  isInitialized = false;
  await initializeScheduler();
}

// ============================================================
// Manual run — execute all active jobs immediately
// ============================================================
const runScheduledJobs = async () => {
  try {
    const now = new Date();
    const { data: jobs } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .eq("is_active", true);

    if (!jobs) return { processed: 0 };

    let processed = 0;
    const results = [];

    for (const job of jobs) {
      const executor = jobExecutors[job.job_type];
      if (!executor) continue;

      try {
        const result = await executor(job.config || {});
        await supabase
          .from("scheduled_jobs")
          .update({ last_run_at: now.toISOString() })
          .eq("id", job.id);

        results.push({ job: job.name, type: job.job_type, result, status: "success" });
        processed++;
      } catch (err) {
        results.push({ job: job.name, type: job.job_type, error: err.message, status: "failed" });
      }
    }

    return { processed, results };
  } catch (err) {
    return { processed: 0, error: err.message };
  }
};

// ============================================================
// CRUD Handlers (with scheduler reload)
// ============================================================
const getScheduledJobs = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    // Attach runtime status
    const enriched = (data || []).map((job) => ({
      ...job,
      _running: !!scheduledTasks[job.id],
    }));

    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
};

const createScheduledJob = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").insert(req.body).select().single();
    if (error) throw error;

    // Start the new job immediately if active
    if (data.is_active) startJob(data);

    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateScheduledJob = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;

    // Reload scheduler to apply changes
    await reloadScheduler();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteScheduledJob = async (req, res, next) => {
  try {
    stopJob(req.params.id);
    await supabase.from("scheduled_jobs").delete().eq("id", req.params.id);
    res.json({ success: true });
  } catch (error) { next(error); }
};

const runNow = async (req, res, next) => {
  try {
    const result = await runScheduledJobs();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = {
  initializeScheduler,
  reloadScheduler,
  runScheduledJobs,
  getScheduledJobs,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  runNow,
};
