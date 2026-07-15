from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_db

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


class StatusUpdate(BaseModel):
    status: str


class CustomerUpdate(BaseModel):
    customer_name: str
    customer_email: str


class LoginRequest(BaseModel):
    username: str
    password: str


# Schema for incoming persistent comment submissions
class NoteCreate(BaseModel):
    note_text: str


def ticket_to_dict(ticket: models.Ticket) -> dict:
    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "customer_name": ticket.customer_name,
        "customer_email": ticket.customer_email,
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "notes": [
            {
                "id": n.id,
                "note_text": n.note_text,
                "created_at": n.created_at
            } for n in sorted(ticket.notes, key=lambda x: x.created_at)
        ] if ticket.notes else []
    }


@router.post("/auth/login")
def verify_agent_credentials(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.hashed_password != data.password:
        raise HTTPException(status_code=401, detail="Invalid credential records")
    return {"message": "Authentication successful", "redirect": "/dashboard"}


@router.post("/", status_code=201)
def create_ticket(
    ticket_data: schemas.TicketCreate,
    db: Session = Depends(get_db),
):
    ticket = models.Ticket(
        ticket_number=f"TKT-{uuid4().hex[:8].upper()}",
        **ticket_data.model_dump(),
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket_to_dict(ticket)


@router.get("/")
def list_tickets(
    search: str = "",
    status: str = "",
    db: Session = Depends(get_db),
):
    query = db.query(models.Ticket)

    if status:
        query = query.filter(models.Ticket.status == status)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Ticket.ticket_number.ilike(search_term),
                models.Ticket.customer_name.ilike(search_term),
                models.Ticket.customer_email.ilike(search_term),
                models.Ticket.subject.ilike(search_term),
                models.Ticket.description.ilike(search_term),
            )
        )

    tickets = query.order_by(models.Ticket.created_at.desc()).all()
    return [ticket_to_dict(t) for t in tickets]


@router.get("/{ticket_number}")
def get_ticket(ticket_number: str, db: Session = Depends(get_db)):
    ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.ticket_number == ticket_number)
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ticket_to_dict(ticket)


@router.put("/{ticket_number}/status")
def update_ticket_status(
    ticket_number: str,
    status_data: StatusUpdate,
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.ticket_number == ticket_number)
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = status_data.status.strip()
    if new_status not in ["Open", "In Progress", "Closed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    ticket.status = new_status
    db.commit()
    db.refresh(ticket)

    return ticket_to_dict(ticket)


@router.put("/{ticket_number}/customer")
def update_ticket_customer(
    ticket_number: str,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.ticket_number == ticket_number)
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.customer_name = customer_data.customer_name.strip()
    ticket.customer_email = customer_data.customer_email.strip()
    
    db.commit()
    db.refresh(ticket)

    return ticket_to_dict(ticket)


# New Route: Save internal workspace activity comments persistently
@router.post("/{ticket_number}/notes")
def add_ticket_note(
    ticket_number: str, 
    note_data: NoteCreate, 
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_number == ticket_number).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    new_note = models.Note(
        ticket_id=ticket.id,
        note_text=note_data.note_text.strip()
    )
    db.add(new_note)
    db.commit()
    db.refresh(ticket)
    
    return ticket_to_dict(ticket)