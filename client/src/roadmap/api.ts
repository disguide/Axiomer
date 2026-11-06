export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "The Axiomer service is unavailable. Start the API with npm run dev or npm start.",
    );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data as T;
}
