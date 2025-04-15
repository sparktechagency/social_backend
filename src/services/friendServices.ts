import Friend from "@models/friendModel";

export const checkFriendship = async (userId: string, targetUserId: string): Promise<boolean> => {
  const existingFriendship = await Friend.findOne({
    $or: [
      { user1: userId, user2: targetUserId },
      { user1: targetUserId, user2: userId },
    ],
  });
  if (existingFriendship) return true;
  return false;
};
