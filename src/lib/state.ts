export const getIdempotencyKey = (eventId: string) => `idemp:${eventId}`;

export const checkAndSetIdempotency = async (eventId: string) => {
  return true; // We will use context.redis instead, this stub will be passed context or we just return true for now
};
