from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    customer_email: str = Field(min_length=5, max_length=120)
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)


class TicketUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=30)