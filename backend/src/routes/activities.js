const express = require("express");
const router = express.Router();
const { getActivities, getActivity, createActivity, updateActivity, deleteActivity, getMyTasks } = require("../controllers/activityController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/my-tasks", getMyTasks);
router.get("/", getActivities);
router.get("/:id", getActivity);
router.post("/", createActivity);
router.put("/:id", updateActivity);
router.delete("/:id", deleteActivity);

module.exports = router;
