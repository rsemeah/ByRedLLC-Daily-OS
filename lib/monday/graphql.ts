import "server-only"

const MONDAY_API_URL = "https://api.monday.com/v2"

export type MondayGraphQLError = { message: string }

export async function mondayGraphql<T>(options: {
  query: string
  variables?: Record<string, unknown>
}): Promise<T> {
  const token =
    process.env.MONDAY_API_KEY?.trim() ||
    process.env.MONDAY_TOKEN?.trim()
  if (!token) {
    throw new Error("MONDAY_API_KEY is not configured.")
  }

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      query: options.query,
      variables: options.variables ?? {},
    }),
  })

  const body = (await res.json()) as {
    data?: T
    errors?: MondayGraphQLError[]
  }

  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}`)
  }

  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "))
  }

  if (body.data === undefined) {
    throw new Error("Monday API returned no data.")
  }

  return body.data
}
