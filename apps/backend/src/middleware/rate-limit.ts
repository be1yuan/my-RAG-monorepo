import { Context, type Next } from 'hono'
import { Errors } from '../errors'
import { config } from '../config'


interface Bucket {
    tokens: number
    lastRefill: number
}

// 内存版 token bucket(MVP 用 Map,生产换 Redis)
const buckets = new Map<string, Bucket>()

// 定期清理过期桶(防内存泄漏)
setInterval(() => {
    const now = Date.now()
    const FIVE_MIN = 5 * 60 * 1000

    for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.lastRefill > FIVE_MIN) {
            buckets.delete(key)
        }
    }
}, 60_000).unref()  // unref 让定时器不阻塞进程退出   

export function rateLimit() {
    return async (c: Context, next: Next) => {
        // 1. health endpoint 跳过限流
        if (c.req.path === '/api/health') return next()
        
        // 2. 限流 key(用户 ID 优先,fallback IP)
        const userId = c.req.header('x-user-id')
        const ip = 
            c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
            c.req.header('x-real-ip')?.trim() ||
            "anonymous"
        const key = userId ? `user:${userId}` : `ip:${ip}`

        // 3. 选择 limit(问答 endpoint 更严格)
        const isMessageEndpoint = c.req.path.includes('/message')
        const limit = isMessageEndpoint ? config.RATE_LIMIT_MESSAGE_PER_MIN : config.RATE_LIMIT_PER_MIN

        // 4. Token bucket 算法
        const now = Date.now()
        let bucket = buckets.get(key)
        if (!bucket) {
            bucket = {
                tokens: limit,
                lastRefill: now,
            }
            buckets.set(key, bucket)
        }

        // 匀速补充
        const elapsedMs = now - bucket.lastRefill
        const refillPerMs = limit / 60000  // 每分钟补充 limit 个 token
        bucket.tokens = Math.min(limit, bucket.tokens + refillPerMs * elapsedMs)
        bucket.lastRefill = now

        // 5. 检查 token
        if (bucket.tokens < 1) {
            const needMs = (1 - bucket.tokens) / refillPerMs // 需要补充的毫秒数
            const retryAfterSec = Math.ceil(needMs / 1000) // 重试时间 retryAfterSec 秒后
            c.header('x-RateLimit-Limit', String(limit)) //限制每分钟请求数为 limit
            c.header('x-RateLimit-Remaining', '0') // 剩余 token 数为 0
            c.header('Retry-After', String(retryAfterSec)) // 重试时间 retryAfterSec 秒后
            throw Errors.rateLimit(retryAfterSec)
        }
        
        // 6. 消耗 token + 设响应头
        bucket.tokens--
        c.header('x-RateLimit-Limit', String(limit)) //限制每分钟请求数为 limit
        c.header('x-RateLimit-Remaining', String(Math.floor(bucket.tokens))) // 剩余 token 数向下取整

        await next()
    }
}

// 测试辅助
export function resetRateLimit() {
    buckets.clear()
}