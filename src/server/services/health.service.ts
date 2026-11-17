import { healthRepository } from '@/server/repositories/health.repository';

export function checkDatabase(): Promise<void> {
  return healthRepository.ping();
}
