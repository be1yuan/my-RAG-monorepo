import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from '../config'
import * as schema from './schema'

//1. 连接数据库
export const pool = new Pool({
    connectionString: config.DATABASE_URL,
     keepAlive: true,                                    // ⭐ 防止 NAT/防火墙断连
    idleTimeoutMillis: 30000,                            // ⭐ 30s 空闲超时(默认 10s 太短)
    connectionTimeoutMillis: 5000,                       // ⭐ 5s 连接超时
    max: 10,                                             // ⭐ 限制 pool 最大连接数
})

//2. 创建 Drizzle 实例
export const db = drizzle(pool, { schema })

//3. 健康检查(给 /api/health 用)
export async function checkDbConnection(): Promise<boolean> {
    try {
        await pool.query('SELECT 1')
        return true
    } catch (error) {
        console.error('[DB] connection failed:', error)
        return false
    }
}

//4. 关闭数据库连接
export async function closeDb(): Promise<void> {
    await pool.end()
}