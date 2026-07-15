from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import models
from app.database import Base, engine, SessionLocal
from app.routers import tickets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Support CRM")

# Step B: Automatically seed a default agent account if the table is empty
@app.on_event("startup")
def seed_default_user():
    db = SessionLocal()
    try:
        admin_exists = db.query(models.User).filter(models.User.username == "pawan@datastraw.co").first()
        if not admin_exists:
            default_agent = models.User(
                username="pawan@datastraw.co", 
                hashed_password="password123"
            )
            db.add(default_agent)
            db.commit()
    finally:
        db.close()

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(tickets.router)

templates = Jinja2Templates(directory="app/templates")


@app.get("/")
def welcome_page(request: Request):
    """Brand Landing & Portal Selector Welcome Hub"""
    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
    )


@app.get("/login")
def login_page(request: Request):
    """Secure Agent Portal Authentication Gate"""
    return templates.TemplateResponse(
        request=request,
        name="login.html",
    )


@app.get("/dashboard")
def agent_dashboard(request: Request):
    """Internal Metrics Workspace"""
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
    )


@app.get("/tickets/new")
def create_ticket_page(request: Request):
    """Customer Self-Service Issue Filing Form"""
    return templates.TemplateResponse(
        request=request,
        name="ticket_form.html",
    )


@app.get("/tickets/{ticket_number}")
def ticket_detail_page(request: Request, ticket_number: str):
    """Secure Agent Core Workspace Workspace Detail Panel"""
    return templates.TemplateResponse(
        request=request,
        name="ticket-detail.html",
        context={"ticket_number": ticket_number},
    )