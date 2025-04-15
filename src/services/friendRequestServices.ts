import FriendRequest from "@models/friendRequestModel";
import { RequestStatus } from "@shared/enums";

export const checkFriendRequest = async (userId: string, targetUserId: string): Promise<string> => {
  const isFriendRequestSent = await FriendRequest.findOne({
    sender: userId,
    receiver: targetUserId,
    status: RequestStatus.PENDING,
  });
  if (isFriendRequestSent) return "sent";
  const isFriendRequestReceived = await FriendRequest.findOne({
    sender: targetUserId,
    receiver: userId,
    status: RequestStatus.PENDING,
  });
  if (isFriendRequestReceived) return "received";
  return "none";
};
