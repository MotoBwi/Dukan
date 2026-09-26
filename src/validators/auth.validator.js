const { z } = require('zod');
const { password } = require('./common.validator');

const login = z.object({
  identifier: z.string().trim().min(3).max(150), // phone or email
  password: z.string().min(1).max(128),
});

const changePassword = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

module.exports = { login, changePassword };
