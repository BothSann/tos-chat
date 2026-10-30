// Types shared between apps/api and apps/web.
// Socket event contracts and DTO shapes land here as lessons add them.
export interface UserView {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}
