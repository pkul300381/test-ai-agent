"""
Payment Card Management AI Agent — FastAPI Backend

Provides a streaming chat endpoint backed by Claude (Anthropic).
Supports Claude Opus 4.6, Sonnet 4.6, and Haiku 4.5.
"""

import json
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

# Models that support adaptive thinking (Claude Opus 4.6 and Sonnet 4.6)
THINKING_MODELS = {"claude-opus-4-6", "claude-sonnet-4-6"}

AVAILABLE_MODELS = [
    {
        "id": "claude-opus-4-6",
        "name": "Claude Opus 4.6",
        "description": "Most capable — adaptive thinking enabled",
        "provider": "anthropic",
    },
    {
        "id": "claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6",
        "description": "Balanced speed & quality — adaptive thinking enabled",
        "provider": "anthropic",
    },
    {
        "id": "claude-haiku-4-5",
        "name": "Claude Haiku 4.5",
        "description": "Fastest & most cost-effective",
        "provider": "anthropic",
    },
]

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "claude-opus-4-6"
    stream: bool = True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {
        "status": "ok",
        "api_key_configured": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }


@app.get("/models")
def get_models():
    return {"models": AVAILABLE_MODELS}


@app.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not set. Create backend/.env from .env.example.",
        )

    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    create_kwargs: dict = {
        "model": request.model,
        "system": SYSTEM_PROMPT,
        "messages": messages,
    }

    # Adaptive thinking is supported on Opus 4.6 and Sonnet 4.6 only
    if request.model in THINKING_MODELS:
        create_kwargs["thinking"] = {"type": "adaptive"}

    if request.stream:
        # Use higher max_tokens for streaming (no HTTP timeout risk)
        create_kwargs["max_tokens"] = 64000

        def generate():
            try:
                with client.messages.stream(**create_kwargs) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except anthropic.APIError as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        create_kwargs["max_tokens"] = 16000
        response = client.messages.create(**create_kwargs)
        text = next((b.text for b in response.content if b.type == "text"), "")
        return {"content": text, "model": request.model}
