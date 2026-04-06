import {
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";

function createStatsSseStream(
  source: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();

      let currentObject = "";
      let braceDepth = 0;
      let inString = false;
      let escaped = false;

      const enqueueSseData = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const processText = (text: string) => {
        for (const char of text) {
          if (braceDepth === 0) {
            if (char === "{") {
              currentObject = "{";
              braceDepth = 1;
              inString = false;
              escaped = false;
            }
            continue;
          }

          currentObject += char;

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === "\\" && inString) {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") {
              braceDepth += 1;
            } else if (char === "}") {
              braceDepth -= 1;

              if (braceDepth === 0) {
                try {
                  enqueueSseData(JSON.parse(currentObject));
                } catch {
                  // Ignore malformed chunks and continue streaming.
                }
                currentObject = "";
              }
            }
          }
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          processText(decoder.decode(value, { stream: true }));
        }

        const trailingText = decoder.decode();
        if (trailingText.length > 0) {
          processText(trailingText);
        }

        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode(
            'event: error\ndata: {"error":"Failed to process Docker stats stream"}\n\n',
          ),
        );
        controller.close();
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<Response> {
  const { endpointId, id } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.read",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  try {
    const dockerStream = await resolved.docker.getContainerStats(id);
    return new Response(createStatsSseStream(dockerStream), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
