import { promises as fs } from 'fs'
import * as path from 'path'

/**
 * 文档本地存储 · 路径规范: {UPLOAD_DIR}/{kbId}/{docId}.{ext}
 * UPLOAD_DIR 硬编码 'apps/backend/uploads' 即可(M2 简化,config 不加)
 */
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

export async function saveDocument(
    kbId: string,
    docId: string,
    filename: string,
    content: Buffer,
): Promise<string> {
    const ext = path.extname(filename).toLowerCase().replace('.', '') || 'bin' // 文档扩展名
    const dir = path.join(UPLOAD_DIR, kbId) // 文档存储目录
    await fs.mkdir(dir, { recursive: true }) // 创建目录(如果不存在)
    const filePath = path.join(dir, `${docId}.${ext}`) // 文档存储路径
    await fs.writeFile(filePath, content) // 写入文件
    return filePath
}

export async function readDocument(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath)
}

export async function deleteDocument(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath) // 删除文件
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            throw error
        }
        // 文件不存在,忽略
        return
    }
}
