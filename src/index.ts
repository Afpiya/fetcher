/**
 * Тип для параметров поиска, которые могут быть переданы в запрос.
 *
 * Ключи могут быть строками, а значения могут быть:
 * - строками
 * - числами
 * - булевыми значениями
 * - undefined
 * - массивами, содержащими строки, числа, булевы значения или undefined
 */
export type TypeSearchParams = {
	[key: string]:
		| string
		| number
		| boolean
		| undefined
		| Array<string | number | boolean | undefined>
}

/**
 * Интерфейс для параметров запроса, расширяющий стандартные параметры RequestInit.
 *
 * @extends RequestInit
 * @property {Record<string, string>} [headers] - Заголовки, которые будут добавлены к запросу.
 * @property {TypeSearchParams} [params] - Параметры поиска, которые будут добавлены к URL.
 */
export interface RequestOptions extends RequestInit {
	headers?: Record<string, string>
	params?: TypeSearchParams
}

/**
 * Интерфейс для конфигурации Fetcher, который содержит базовый URL, заголовки, параметры и
 * дополнительные опции запроса.
 */
export interface FetcherConfig {
  baseUrl: string
  headers?: Record<string, string>
  params?: TypeSearchParams
  options?: RequestOptions
}


/**
 * Тип для конфигурации запроса, который может содержать параметры и дополнительные параметры.
 *
 * @template Params - Тип параметров, которые могут быть переданы в запрос.
 * @property {RequestOptions} [config] - Дополнительные параметры запроса.
 * @property {Params} [params] - Параметры, которые будут добавлены к запросу, если они определены.
 */
export type TypeFetchRequestConfig<Params = undefined> =
	Params extends undefined
		? { config?: RequestOptions }
		: { params: Params; config?: RequestOptions }


/**
 * Класс для обработки ошибок, возникающих при выполнении запросов.
 *
 * @extends Error
 * @property {number} statusCode - Код статуса HTTP, связанный с ошибкой.
 * @property {string} message - Сообщение об ошибке.
 */
export class FetcherError extends Error {
	public constructor(
		public statusCode: number,
		public message: string
	) {
		super(message) // Вызов конструктора родительского класса

		// Установка прототипа для корректной работы instanceof
		Object.setPrototypeOf(this, new.target.prototype)
	}
}
export class Fetcher {
	private baseUrl: string
	public headers?: Record<string, string>
	public params?: TypeSearchParams
	public options?: RequestOptions

	/**
	 * Конструктор класса FetchClient.
	 *
	 * @param {Object} init - Начальные параметры для клиента.
	 * @param {string} init.baseUrl - Базовый URL для запросов.
	 * @param {Record<string, string>} [init.headers] - Заголовки для запросов.
	 * @param {TypeSearchParams} [init.params] - Параметры для поиска.
	 * @param {RequestOptions} [init.options] - Дополнительные параметры запроса.
	 */
	public constructor(init: FetcherConfig) {
		this.baseUrl = init.baseUrl
		this.headers = init.headers
		this.params = init.params
		this.options = init.options
	}

	/**
	 * Создает строку параметров поиска для URL.
	 *
	 * @param {TypeSearchParams} params - Параметры поиска.
	 * @returns {string} - Строка параметров поиска, начинающаяся с "?".
	 */
	private createSearchParams(params: TypeSearchParams): string {
		const searchParams = new URLSearchParams()

		for (const key in { ...this.params, ...params }) {
			if (Object.prototype.hasOwnProperty.call(params, key)) {
				const value = params[key]

				if (Array.isArray(value)) {
					value.forEach(currentValue => {
						if (currentValue) {
							searchParams.append(key, currentValue.toString())
						}
					})
				} else if (value) {
					searchParams.set(key, value.toString())
				}
			}
		}

		return `?${searchParams.toString()}`
	}

	/**
	 * Выполняет HTTP-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {RequestInit['method']} method - Метод HTTP (GET, POST, PUT и т.д.).
	 * @param {RequestOptions} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 * @throws {FetchError} - Если ответ не успешен, выбрасывает ошибку FetchError.
	 */
	private async request<T>(
		endpoint: string,
		method: RequestInit['method'],
		options: RequestOptions = {}
	): Promise<T> {
		let url = `${this.baseUrl}/${endpoint}`

		if (options.params) {
			url += this.createSearchParams(options.params)
		}

		const config: RequestInit = {
			...options,
			...(!!this.options && { ...this.options }),
			method,
			headers: {
				...(!!options?.headers && options.headers),
				...this.headers
			}
		}

		const response: Response = await fetch(url, config)

		if (!response.ok) {
			const error = (await response.json()) as
				| { message: string }
				| undefined
			throw new FetcherError(
				response.status,
				error?.message || response.statusText
			)
		}

		if (
			response.headers.get('Content-Type')?.includes('application/json')
		) {
			return (await response.json()) as unknown as T
		} else {
			return (await response.text()) as unknown as T
		}
	}

	/**
	 * Выполняет GET-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {Omit<RequestOptions, 'body'>} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 */
	public get<T>(
		endpoint: string,
		options: Omit<RequestOptions, 'body'> = {}
	): Promise<T> {
		return this.request<T>(endpoint, 'GET', options)
	}

	/**
	 * Выполняет POST-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {Record<string, any>} [body] - Тело запроса.
	 * @param {RequestOptions} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 */
	public post<T>(
		endpoint: string,
		body?: Record<string, any>,
		options: RequestOptions = {}
	): Promise<T> {
		return this.request<T>(endpoint, 'POST', {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(options?.headers || {})
			},
			...(!!body && { body: JSON.stringify(body) })
		})
	}

	/**
	 * Выполняет PUT-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {Record<string, any>} [body] - Тело запроса.
	 * @param {RequestOptions} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 */
	public put<T>(
		endpoint: string,
		body?: Record<string, any>,
		options: RequestOptions = {}
	): Promise<T> {
		return this.request<T>(endpoint, 'PUT', {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(options?.headers || {})
			},
			...(!!body && { body: JSON.stringify(body) })
		})
	}

	/**
	 * Выполняет DELETE-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {Omit<RequestOptions, 'body'>} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 */
	public delete<T>(
		endpoint: string,
		options: Omit<RequestOptions, 'body'> = {}
	): Promise<T> {
		return this.request<T>(endpoint, 'DELETE', options)
	}

	/**
	 * Выполняет PATCH-запрос.
	 *
	 * @template T
	 * @param {string} endpoint - Конечная точка API для запроса.
	 * @param {Record<string, any>} [body] - Тело запроса.
	 * @param {RequestOptions} [options={}] - Дополнительные параметры запроса.
	 * @returns {Promise<T>} - Ответ от сервера, преобразованный в тип T.
	 */
	public patch<T>(
		endpoint: string,
		body?: Record<string, any>,
		options: RequestOptions = {}
	): Promise<T> {
		return this.request<T>(endpoint, 'PATCH', {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(options?.headers || {})
			},
			...(!!body && { body: JSON.stringify(body) })
		})
	}
}

interface FetcherInstance  {
  Fetcher: typeof Fetcher
  create: (init: FetcherConfig) => Fetcher;
}

const fetcher: FetcherInstance = {
  Fetcher,
  create: (init) => new Fetcher(init)
}

export default fetcher;
