import { handleVercelGet } from '../backend/src/app/vercelHttp.ts';
import { handlePlannerRequest } from '../backend/src/features/planner/plannerHttp.ts';

export async function GET(request: Request): Promise<Response> {
  return handleVercelGet(request, handlePlannerRequest);
}
