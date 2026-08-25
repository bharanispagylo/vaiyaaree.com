import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const [rows] = await pool.query("SELECT 1 AS connected");

        return NextResponse.json({
            success: true,
            database: rows,
        });
    } catch (err) {
        console.error("[DB HEALTH ERROR]", {
            code: err?.code,
            message: err?.message,
            errno: err?.errno,
            syscall: err?.syscall,
            address: err?.address,
            port: err?.port,
        });

        return NextResponse.json(
            {
                success: false,
                error: err?.code || "MYSQL_ERROR",
                message: err?.message || "Database connection failed",
            },
            { status: 500 }
        );
    }
}
