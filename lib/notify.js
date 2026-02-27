import connectDB from "@/lib/db";
import { sendEmail } from "@/lib/email";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function createNotifications({ userIds = [], title, message, type, meta = {} }) {
  if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message || !type) {
    return;
  }

  const uniqueUserIds = [...new Set(userIds.map((item) => String(item)))];

  await connectDB();

  const docs = uniqueUserIds.map((userId) => ({
    user: userId,
    title,
    message,
    type,
    meta,
  }));

  await Notification.insertMany(docs);
}

export async function notifyRoles({ roles = [], title, message, type, meta = {}, sendMail = false }) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return;
  }

  await connectDB();

  const users = await User.find({ role: { $in: roles } }, "_id email name").lean();

  if (!users.length) {
    return;
  }

  await createNotifications({
    userIds: users.map((user) => user._id),
    title,
    message,
    type,
    meta,
  });

  if (sendMail) {
    await Promise.all(
      users.map(async (user) => {
        if (!user.email) {
          return;
        }

        try {
          await sendEmail({
            to: user.email,
            subject: title,
            text: message,
          });
        } catch {
          // Email failure should not fail request lifecycle.
        }
      }),
    );
  }
}

export async function notifyUser({ userId, email, title, message, type, meta = {}, sendMail = false }) {
  if (!userId) {
    return;
  }

  await createNotifications({
    userIds: [userId],
    title,
    message,
    type,
    meta,
  });

  if (sendMail && email) {
    try {
      await sendEmail({
        to: email,
        subject: title,
        text: message,
      });
    } catch {
      // Email failure should not fail request lifecycle.
    }
  }
}
