import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Log } from '../logging_middleware/logger.js';
import cron from 'cron';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const notifications = [];
const userPreferences = new Map();
const sseClients = new Map();

const buildNotification = ({ recipientId, type, title, message, channel = 'in-app', priority = 'normal', metadata = {}, expiresAt = null }) => {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  return {
    id,
    recipientId,
    type,
    title,
    message,
    channel,
    priority,
    metadata,
    status: 'pending',
    createdAt: now,
    readAt: null,
    deliveredAt: null,
    expiresAt,
    acknowledgedAt: null
  };
};

const notifySubscribers = (userId, event, payload) => {
  const clients = sseClients.get(userId);
  if (!clients) return;

  const dataString = JSON.stringify(payload);
  clients.forEach((res) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${dataString}\n\n`);
  });
};

const findNotificationById = (notificationId) => notifications.find((item) => item.id === notificationId);

app.post('/api/v1/notifications', (req, res) => {
  const { recipientId, type, title, message, channel, priority, metadata, expiresAt } = req.body;

  if (!recipientId || !type || !title || !message) {
    return res.status(400).json({ error: 'recipientId, type, title, and message are required.' });
  }

  const notification = buildNotification({ recipientId, type, title, message, channel, priority, metadata, expiresAt });
  notifications.push(notification);
  notifySubscribers(recipientId, 'notification.created', notification);

  Log('backend', 'info', 'notification', `Created notification ${notification.id} for ${recipientId}`);
  return res.status(201).json(notification);
});

app.get('/api/v1/users/:userId/notifications', (req, res) => {
  const { userId } = req.params;
  const { status = 'all', channel, limit = 50, offset = 0 } = req.query;

  const items = notifications.filter((item) => item.recipientId === userId && (item.expiresAt ? new Date(item.expiresAt) > new Date() : true));
  const filtered = items.filter((item) => {
    if (status !== 'all') {
      if (status === 'unread' && item.status !== 'unread' && item.status !== 'pending') return false;
      if (status === 'read' && item.status !== 'read') return false;
    }
    if (channel && item.channel !== channel) return false;
    return true;
  });

  const paged = filtered.slice(Number(offset), Number(offset) + Number(limit));

  return res.json({
    userId,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset),
    notifications: paged
  });
});

app.get('/api/v1/notifications/:notificationId', (req, res) => {
  const notification = findNotificationById(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  return res.json(notification);
});

app.patch('/api/v1/notifications/:notificationId', (req, res) => {
  const notification = findNotificationById(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  const { status } = req.body;
  if (!['read', 'unread', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'status must be one of read, unread, pending.' });
  }

  notification.status = status;
  notification.readAt = status === 'read' ? new Date().toISOString() : null;

  notifySubscribers(notification.recipientId, 'notification.updated', notification);
  return res.json({ id: notification.id, status: notification.status, readAt: notification.readAt });
});

app.post('/api/v1/notifications/:notificationId/acknowledge', (req, res) => {
  const notification = findNotificationById(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  notification.status = 'acknowledged';
  notification.acknowledgedAt = new Date().toISOString();
  notifySubscribers(notification.recipientId, 'notification.acknowledged', notification);

  return res.json({ id: notification.id, status: notification.status, acknowledgedAt: notification.acknowledgedAt });
});

app.delete('/api/v1/notifications/:notificationId', (req, res) => {
  const index = notifications.findIndex((item) => item.id === req.params.notificationId);
  if (index === -1) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  const [deleted] = notifications.splice(index, 1);
  notifySubscribers(deleted.recipientId, 'notification.deleted', { id: deleted.id });
  return res.json({ id: deleted.id, deleted: true });
});

app.put('/api/v1/users/:userId/preferences', (req, res) => {
  const { userId } = req.params;
  const { enabledChannels = ['in-app'], autoRead = false, preferences = {} } = req.body;

  const userPref = {
    userId,
    enabledChannels,
    autoRead,
    preferences
  };

  userPreferences.set(userId, userPref);
  return res.json(userPref);
});

app.get('/api/v1/realtime/notifications/subscribe', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clients = sseClients.get(userId);
  if (!clients) {
    clients = new Set();
    sseClients.set(userId, clients);
  }
  clients.add(res);

  res.write(`event: connection.opened\ndata: ${JSON.stringify({ userId, message: 'SSE connection established' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
    if (clients.size === 0) {
      sseClients.delete(userId);
    }
  });
});

new cron.CronJob('*/30 * * * * *', () => {
  const now = new Date();
  const expired = notifications.filter((item) => item.expiresAt && new Date(item.expiresAt) <= now);
  expired.forEach((item) => {
    const index = notifications.findIndex((notification) => notification.id === item.id);
    if (index >= 0) {
      notifications.splice(index, 1);
      notifySubscribers(item.recipientId, 'notification.expired', { id: item.id });
    }
  });
}).start();

app.listen(PORT, () => {
  Log('backend', 'info', 'service', `Server is running on port ${PORT}`);
});
