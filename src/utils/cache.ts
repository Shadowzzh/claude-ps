import { readFile, stat } from "node:fs/promises";

/**
 * 文件缓存条目
 */
interface CacheEntry<T> {
	/** 缓存的数据 */
	data: T;
	/** 文件修改时间（用于验证缓存有效性） */
	mtimeMs: number;
	/** 缓存创建时间 */
	cachedAt: number;
}

/**
 * LRU 缓存配置
 */
interface CacheOptions<T> {
	/** 最大缓存条目数，默认 50 */
	maxSize?: number;
	/** 缓存过期时间（毫秒），默认 5 分钟 */
	ttl?: number;
	/** 数据加载函数 */
	loader: (path: string) => Promise<T>;
}

/**
 * 文件内容缓存
 * 基于 mtime 和 LRU 策略的文件缓存
 */
export class FileCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private maxSize: number;
	private ttl: number;
	private loader: (path: string) => Promise<T>;

	constructor(options: CacheOptions<T>) {
		this.maxSize = options.maxSize ?? 50;
		this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 分钟
		this.loader = options.loader;
	}

	/**
	 * 获取文件内容（优先从缓存读取）
	 * @param path 文件路径
	 * @returns 文件内容
	 */
	async get(path: string): Promise<T> {
		try {
			// 检查文件是否存在并获取 mtime
			const stats = await stat(path);
			const currentMtime = stats.mtimeMs;

			// 检查缓存
			const cached = this.cache.get(path);
			const now = Date.now();

			// 缓存命中且未过期
			if (
				cached &&
				cached.mtimeMs === currentMtime &&
				now - cached.cachedAt < this.ttl
			) {
				// 更新访问顺序（LRU）
				this.cache.delete(path);
				this.cache.set(path, cached);
				return cached.data;
			}

			// 缓存未命中或已过期，重新加载
			const data = await this.loader(path);

			// 存入缓存
			this.cache.set(path, {
				data,
				mtimeMs: currentMtime,
				cachedAt: now,
			});

			// 清理过期和超出大小限制的缓存
			this.cleanup();

			return data;
		} catch {
			// 文件不存在或读取失败，返回空数据
			return this.loader(path).catch(() => {
				// 如果 loader 也失败，抛出错误
				throw new Error(`Failed to load file: ${path}`);
			});
		}
	}

	/**
	 * 清理过期和超出大小限制的缓存
	 */
	private cleanup(): void {
		const now = Date.now();
		const entries = Array.from(this.cache.entries());

		// 删除过期的缓存
		for (const [key, entry] of entries) {
			if (now - entry.cachedAt >= this.ttl) {
				this.cache.delete(key);
			}
		}

		// 如果仍然超出大小限制，删除最旧的条目
		while (this.cache.size > this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			} else {
				break;
			}
		}
	}

	/**
	 * 清除指定文件的缓存
	 * @param path 文件路径
	 */
	clear(path: string): void {
		this.cache.delete(path);
	}

	/**
	 * 清除所有缓存
	 */
	clearAll(): void {
		this.cache.clear();
	}

	/**
	 * 获取缓存大小
	 */
	get size(): number {
		return this.cache.size;
	}
}

/**
 * 读取文件内容的辅助函数
 * @param path 文件路径
 * @returns 文件内容字符串
 */
export async function readTextFile(path: string): Promise<string> {
	return readFile(path, "utf-8");
}
