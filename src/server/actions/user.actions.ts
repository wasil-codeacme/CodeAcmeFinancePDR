'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as userService from '@/server/services/user.service';
import {
  changeUserRoleSchema,
  inviteUserSchema,
  removeUserSchema,
} from '@/server/validators/user.schema';

export const inviteUser = writeAction({
  schema: inviteUserSchema,
  permission: PERMISSION.USERS_MANAGE,
  handler: async (input, actor) => {
    const user = await userService.inviteUser(actor, input);
    return { id: user.id };
  },
});

export const changeUserRole = writeAction({
  schema: changeUserRoleSchema,
  permission: PERMISSION.USERS_MANAGE,
  handler: async (input, actor) => {
    await userService.changeUserRole(actor, input.userId, input.role);
    return true;
  },
});

export const removeUser = writeAction({
  schema: removeUserSchema,
  permission: PERMISSION.USERS_MANAGE,
  handler: async (input, actor) => {
    await userService.removeUser(actor, input.userId);
    return true;
  },
});
