const { supabase } = require("../config/supabase");
const { runEscalations } = require("./escalationService");
const { rescoreAllLeads } = require("./scoringService");

const runScheduledJobs = async () => {
  try {
    const now = new Date();
    const { data: jobs } = await supabase.from("scheduled_jobs").select("*").eq("is_active", true);
    if (!jobs) return { processed: 0 };

    let processed = 0;
    for (const job of jobs) {
      // Check if job should run
      const shouldRun = !job.next_run_at || new Date(job.next_run_at) <= now;
      if (!shouldRun) continue;

      let result = {};
      switch (job.job_type) {
        case "escalation": result = await runEscalations(); break;
        case "scoring": result = await rescoreAllLeads(); break;
        case "cleanup": {
          const daysOld = job.config?.days_old || 30;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - daysOld);
          await supabase.from("notifications").delete().lt("created_at", cutoff.toISOString()).eq("is_read", true);
          result = { cleaned: true };
          break;
        }
        case "notification": result = { notified: true }; break;
      }

      // Update job timing
      const nextRun = job.interval_minutes ? new Date(now.getTime() + job.interval_minutes * 60 * 1000) : null;
      await supabase.from("scheduled_jobs").update({ last_run_at: now.toISOString(), next_run_at: nextRun?.toISOString() }).eq("id", job.id);
      processed++;
    }
    return { processed };
  } catch (err) { return { processed: 0, error: err.message }; }
};

const getScheduledJobs = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createScheduledJob = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateScheduledJob = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scheduled_jobs").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteScheduledJob = async (req, res, next) => {
  try { await supabase.from("scheduled_jobs").delete().eq("id", req.params.id); res.json({ success: true }); }
  catch (error) { next(error); }
};

const runNow = async (req, res, next) => {
  try { const result = await runScheduledJobs(); res.json({ success: true, data: result }); }
  catch (error) { next(error); }
};

module.exports = { runScheduledJobs, getScheduledJobs, createScheduledJob, updateScheduledJob, deleteScheduledJob, runNow };
