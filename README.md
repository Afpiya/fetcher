# Fetcher

**Лёгкая обёртка над fetch** с удобным созданием URL-параметров, обработкой заголовков и встроенной генерацией ошибок.

- **Публикация:** npm ([https://www.npmjs.com/package/@afpia/fetcher](https://www.npmjs.com/package/@afpia/fetcher))
- **Исходники:** GitHub ([https://github.com/Afpiya/fetcher](https://github.com/Afpiya/fetcher))

---

## Содержание

1. [Краткое описание](#краткое-описание)
2. [Установка](#установка)
3. [Создание экземпляра через `fetcher.create`](#создание-экземпляра-через-fetchercreate)
4. [Примеры использования](#примеры-использования)

---

## Краткое описание

`@afpia/fetcher` — это минималистичный HTTP-клиент на основе встроенного `fetch`, который добавляет:

- Удобную генерацию строки параметров (`params`) для GET-запросов.
- Типизацию через TypeScript (включая `.d.ts`-файлы).
- Встроенный класс ошибки `FetcherError` с HTTP-статусом и сообщением.
- Способы задать базовый URL, заголовки и общие параметры для всех запросов.
- Возможность создавать несколько экземпляров с разными конфигурациями.

Библиотека не тянет внешних зависимостей (кроме нативного `fetch`), поддерживает любые окружения, где есть `fetch`.

---

## Установка

```bash
npm install @afpia/fetcher
# или
yarn add @afpia/fetcher
# или
pnpm add @afpia/fetcher
```

## Создание экземпляра через fetcher.create

Чтобы не переиспользовать «пустой» instance без baseUrl, вы чаще всего захотите создать собственный экземпляр, указывая базовый URL:

```ts
import fetcher from '@afpia/fetcher'

// Создаём новый клиент с базовым URL
const apiClient = fetcher.create({
  baseUrl: 'https://api.example.com',
  headers: {
    'X-Custom-Header': 'foobar'
  },
  // Если вы всегда хотите посылать какие-то query-параметры по умолчанию,
  // можете передать их сюда:
  params: {
    lang: 'ru',           // string
    debug: true,          // boolean
    version: 42           // number
    // или даже массив: roles: ['admin', 'editor']
  }
})

// Теперь можно вызывать apiClient.get, apiClient.post и т.д.
```

## Примеры использования

Обычный GET-запрос с query-параметрами

```ts
import fetcher from '@afpia/fetcher'

const api = fetcher.create({
  baseUrl: 'https://api.example.com/v1',
  headers: {
    'X-API-KEY': '123abc'
  }
})

async function searchArticles(term: string, page: number) {
  try {
    const articles = await api.get<Article[]>('articles', {
      params: {
        q: term,
        page,
        tags: ['news', 'tech']
      }
    })
    console.log('Найденные статьи:', articles)
  } catch (e) {
    if (e instanceof FetcherError) {
      console.error(`HTTP ${e.statusCode}: ${e.message}`)
    } else {
      console.error('Неизвестная ошибка:', e)
    }
  }
}
```

POST-запрос с JSON-телом

```ts
import fetcher from '@afpia/fetcher'

const api = fetcher.create({
  baseUrl: 'https://api.example.com/v1'
})

interface CreateUserDto {
  username: string
  password: string
}

async function registerUser(data: CreateUserDto) {
  try {
    const response = await api.post<{ id: number; username: string }>(
      'users/register',
      data,
      {
        headers: {
          'X-Client-Version': '1.0.0'
        }
      }
    )
    console.log('Пользователь создан:', response)
  } catch (e) {
    if (e instanceof FetcherError) {
      console.warn(`Не удалось создать пользователя: [${e.statusCode}] ${e.message}`)
    } else {
      console.error('Ошибка в процессе регистрации:', e)
    }
  }
}
```