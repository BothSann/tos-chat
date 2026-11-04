// Types shared between apps/api and apps/web.
// Socket event contracts and DTO shapes land here as lessons add them.
export interface UserView {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL";

export interface ApiError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string[]>;
}

export type RoomType = "PUBLIC" | "PRIVATE";

export interface RoomView {
  id: string;
  name: string;
  description: string | null;
  type: RoomType;
  ownerId: string;
  createdAt: string;
  isMember: boolean;
}
