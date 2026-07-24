const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/supabase');

class StorageService {
  constructor() {
    this.s3 = null;
    this.bucket = null;
    this.region = null;
    this.useS3 = false;
    this.localDir = path.join(__dirname, '../../uploads');
  }

  init() {
    const region = process.env.AWS_REGION || process.env.S3_REGION;
    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY;
    const endpoint = process.env.S3_ENDPOINT;

    if (bucket && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: region || 'us-east-1',
        endpoint,
        forcePathStyle: !!endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
      this.region = region || 'us-east-1';
      this.useS3 = true;
      console.log(`✅ Storage: S3 (${this.bucket})`);
    } else {
      if (!fs.existsSync(this.localDir)) fs.mkdirSync(this.localDir, { recursive: true });
      console.log('⚠️  Storage: Local disk (uploads/)');
    }
  }

  _generateKey(originalName, entityType) {
    const ext = path.extname(originalName);
    const name = crypto.randomBytes(16).toString('hex');
    return `${entityType || 'general'}/${name}${ext}`;
  }

  async upload(file, { entityType, entityId, userId, originalName, mimeType }) {
    const key = this._generateKey(originalName, entityType);

    if (this.useS3) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer || file,
        ContentType: mimeType,
        Metadata: { entityType, entityId, userId },
      }));
    } else {
      const filePath = path.join(this.localDir, key);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if (file.path) {
        fs.copyFileSync(file.path, filePath);
      }
    }

    // Save metadata to DB
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        filename: key,
        original_name: originalName,
        mime_type: mimeType,
        file_size: file.size || (file.buffer ? file.buffer.length : 0),
        storage_path: key,
        entity_type: entityType,
        entity_id: entityId,
        uploader_id: userId,
      })
      .select()
      .single();

    return { data, error, key };
  }

  async getSignedUrl(storagePath, expiresIn = 3600) {
    if (this.useS3) {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: storagePath });
      return getSignedUrl(this.s3, command, { expiresIn });
    }
    // Local: return a relative path
    return `/uploads/${storagePath}`;
  }

  async delete(storagePath) {
    if (this.useS3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath }));
    } else {
      const filePath = path.join(this.localDir, storagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  async getAttachments({ entityType, entityId }) {
    const { data, error } = await supabase
      .from('attachments')
      .select('*, uploader:users(name, email)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  async deleteAttachment(id) {
    const { data: attachment } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (attachment) {
      await this.delete(attachment.storage_path);
    }

    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);
    return { error };
  }
}

module.exports = new StorageService();
