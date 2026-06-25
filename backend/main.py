"""
Payment Card Management AI Agent — FastAPI Backend

Provides a streaming chat endpoint backed by OpenAI.
Supports GPT-5, GPT-5 mini, and GPT-4.1.
"""

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import APIError, OpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Payment Card Management AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Domain system prompt (derived from agent.md)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a Software Development Expert specializing in payment technologies, particularly in card management systems.

## Domain Expertise
- Card issuance and lifecycle management: activation, suspension, reissuance, deactivation
- Prepaid card processing: loading, balance management, expiry handling
- BIN (Bank Identification Number) configuration and range management
- Payment security: PCI DSS compliance, EMV standards, tokenization (FPAN → DPAN)
- Card servicing: balance inquiries, transaction disputes, fee schedules

## Risk & Control Focus
- Lifecycle traceability and end-to-end audit trails
- BIN mismatch detection and prevention
- Fraud controls: velocity limits, geographic blocks, transaction limits
- Compliance monitoring: KYC/AML requirements for prepaid programs

## KPIs
- Card activation rate and time-to-activate
- Reissue turnaround time
- Transaction approval rate and decline reasons
- Chargeback ratio and dispute resolution time

## Response Guidelines
- Professional, concise, and technically precise tone
- Provide code examples (Python, Java, REST/ISO 8583) when helpful
- Reference standards: ISO 8583, EMVCo, PCI DSS, Visa/Mastercard card management specs
- Ask targeted clarifying questions when requirements are ambiguous
- Clearly distinguish established practices from innovative suggestions
- If a request is outside your primary payment domain, help anyway but note the boundary"""

# ---------------------------------------------------------------------------
# Model registry
# ---------------------------------------------------------------------------

AVAILABLE_MODELS = [
    {
        "id": "gpt-5-mini",
        "name": "GPT-5 mini",
        "description": "Default economical option",
        "provider": "openai",
    },
    {
        "id": "gpt-5",
        "name": "GPT-5",
        "description": "Most capable",
        "provider": "openai",
    },
    {
        "id": "gpt-4.1",
        "name": "GPT-4.1",
        "description": "Fast and reliable",
        "provider": "openai",
    },
]

AVAILABLE_MODEL_IDS = {model["id"] for model in AVAILABLE_MODELS}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "gpt-5-mini"
    stream: bool = True


def build_openai_input(messages: list[ChatMessage]) -> list[dict]:
    return [
        {
            "role": message.role,
            "content": [{"type": "input_text", "text": message.content}],
        }
        for message in messages
    ]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {
        "status": "ok",
        "api_key_configured": bool(os.environ.get("OPENAI_API_KEY")),
    }


@app.get("/models")
def get_models():
    return {"models": AVAILABLE_MODELS}


@app.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set. Create backend/.env from .env.example.",
        )

    if request.model not in AVAILABLE_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {request.model}")

    client = OpenAI(api_key=api_key)
    create_kwargs = {
        "model": request.model,
        "instructions": SYSTEM_PROMPT,
        "input": build_openai_input(request.messages),
    }

    if request.stream:
        create_kwargs["stream"] = True
        create_kwargs["max_output_tokens"] = 4000

        def generate():
            stream = None
            try:
                stream = client.responses.create(**create_kwargs)
                for event in stream:
                    if event.type == "response.output_text.delta":
                        yield f"data: {json.dumps({'type': 'text', 'content': event.delta})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except APIError as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            finally:
                if stream is not None and hasattr(stream, "close"):
                    stream.close()

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        create_kwargs["max_output_tokens"] = 4000
        response = client.responses.create(**create_kwargs)
        text = response.output_text
        return {"content": text, "model": request.model}
