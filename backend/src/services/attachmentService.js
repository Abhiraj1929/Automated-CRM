const { supabase } = require("../config/supabase");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uploadFile = async (file, entityType, entityId, userId) => {
  try {
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, filename);

    // Save file (Express multer gives us file.buffer)
    if (file.buffer) {
      fs.writeFileSync(storagePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, storagePath);
    }

    const { data, error } = await supabase.from("attachments").insert({
      filename, original_name: file.originalname, mime_type: file.mimetype,
      file_size: file.size, storage_path: storagePath,
      entity_type: entityType, entity_id: entityId, uploaded_by: userId,
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) { return { success: false, error: err.message }; }
};

const getAttachments = async (entityType, entityId) => {
  try {
    const { data, error } = await supabase.from("attachments")
      .select("*, uploader:users!attachments_uploaded_by_fkey(name)")
      .eq("entity_type", entityType).eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (err) { return { success: false, error: err.message }; }
};

const deleteAttachment = async (id) => {
  try {
    const { data: attachment } = await supabase.from("attachments").select("storage_path").eq("id", id).single();
    if (attachment?.storage_path && fs.existsSync(attachment.storage_path)) {
      fs.unlinkSync(attachment.storage_path);
    }
    await supabase.from("attachments").delete().eq("id", id);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
};

// Express handlers
const uploadFileHandler = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: "No file provided" });
    const result = await uploadFile(req.file, entity_type, entity_id, req.user.id);
    res.json(result);
  } catch (error) { next(error); }
};

const getAttachmentsHandler = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query;
    const result = await getAttachments(entity_type, entity_id);
    res.json(result);
  } catch (error) { next(error); }
};

const deleteAttachmentHandler = async (req, res, next) => {
  try {
    const result = await deleteAttachment(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};

module.exports = { uploadFile, getAttachments, deleteAttachment, uploadFileHandler, getAttachmentsHandler, deleteAttachmentHandler };
