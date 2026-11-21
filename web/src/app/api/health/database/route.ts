import { getDatabasePool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getDatabasePool();
    const result = await pool.query<{ value: number }>(
      "SELECT 1 AS value",
    );

    if (result.rows[0]?.value !== 1) {
      throw new Error("Unexpected database response.");
    }

    return Response.json({
      database: "connected",
    });
  } catch {
    return Response.json(
      { error: "Database connection check failed." },
      { status: 503 },
    );
  }
}