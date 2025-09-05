import { Hono } from 'hono';
import { agentsMiddleware } from 'hono-agents';

const app = new Hono<{ Bindings: Env }>();

app.use("*", agentsMiddleware());

export default app;