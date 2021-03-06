import { userWithScope } from '../../../utility/user-with-scope';
import { sql } from 'slonik';
import { RouteMiddleware } from '../../../types/route-middleware';
import { CreateCanvas } from '../../../types/schemas/create-canvas';

// @todo return full canvas.
export const createCanvas: RouteMiddleware<{}, CreateCanvas> = async context => {
  const { userUrn, siteId } = userWithScope(context, ['site.admin']);

  const canvasJson = JSON.stringify(context.requestBody.canvas);

  const localSource = context.requestBody.local_source || null;
  const thumbnail = context.requestBody.thumbnail || null;

  const { canonical_id } = await context.connection.one<{ derived_id: number; canonical_id: number }>(
    sql`select * from create_canvas(${canvasJson}, ${localSource}, ${thumbnail}, ${siteId}, ${userUrn})`
  );

  context.response.body = { id: canonical_id };
  context.response.status = 201;
};
