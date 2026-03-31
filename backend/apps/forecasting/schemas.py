import re
from pydantic import AliasChoices, BaseModel, Field, field_validator
from datetime import date
from dateutil.parser import parse
from typing import Dict


def to_camel(s): return re.sub(r'_([a-z])', lambda m: m.group(1).upper(), s)
def to_pascal(s): c = to_camel(s); return c[0].upper() + c[1:] if c else c


class BaseRow(BaseModel):
    class Config:
        fk_apps: Dict[str, str] = {}
        field_mapping: Dict[str, str] = {}
        extra = 'ignore'
        validate_by_name = True
        populate_by_name = True


class ProduitSchema(BaseRow):
    name: str = Field(validation_alias=AliasChoices('nom', 'Nom', 'names', 'noms', 'Name'))
    current_stock: int = Field(
        validation_alias=AliasChoices('stock actuel', 'Stock actuel', 'current stock', 'stock', 'Stock')
    )
    price: float = Field(validation_alias=AliasChoices('prix', 'Prix', 'price', 'Price'))
    Category__name: str | None = Field(
        default=None,
        validation_alias=AliasChoices('id_category', 'categorie', 'category')
    )
    description: str | None = None
    Supplier__name: str | None = Field(
        default=None,
        validation_alias=AliasChoices('nom fournisseur', 'Nom fournisseur', 'supplier name', 'supplier')
    )
    Supplier__email: str | None = Field(
        default=None,
        validation_alias=AliasChoices('email fournisseur', 'Email fournisseur', 'supplier email')
    )

    class Config:
        fk_apps = {
            "Supplier": "catalogue.Supplier",
            "Category": "catalogue.Category",
        }
        field_mapping = {
            "supplier": "Supplier",
            "category": "Category",
        }


class SupplierSchema(BaseRow):
    name: str = Field(validation_alias=AliasChoices('nom', 'names', 'noms'))
    email: str = Field(validation_alias=AliasChoices('email', 'supplier email'))
    phone: str | None = Field(
        default=None,
        validation_alias=AliasChoices('phone number', 'phone', 'telephone', 'tel')
    )
    address: str | None = Field(
        default=None,
        validation_alias=AliasChoices('address', 'adresse')
    )
    lead_time: int | None = None
    min_order_quantity: int | None = None
    max_order_quantity: int | None = None


class CategorieSchema(BaseRow):
    name: str = Field(
        validation_alias=AliasChoices('nom', 'names', 'noms', 'category', 'categorie')
    )
    description: str | None = None


class GenererSchema(BaseRow):
    """
    Anciennement liaison Generer — crée maintenant directement un MouvementStock.
    """
    MouvementStock__movement_type: str | None = Field(
        validation_alias=AliasChoices('type de mouvement', 'movement type', 'type')
    )
    MouvementStock__date: date = Field(
        validation_alias=AliasChoices('date du mouvement', 'movement date', 'date')
    )
    Product__name: str = Field(
        validation_alias=AliasChoices('produit', 'product', 'prod')
    )
    MouvementStock__quantity: int = Field(
        validation_alias=AliasChoices('quantité', 'quantity', 'qty')
    )

    class Config:
        fk_apps = {
            "MouvementStock": "stock.MouvementStock",
            "Product": "catalogue.Product",
        }
        field_mapping = {
            "produit": "Product",
            "mouvement": "MouvementStock",
        }

    @field_validator("MouvementStock__movement_type")
    def validate_type(cls, v):
        allowed = ["IN", "OUT", "ADJUSTMENT", "RETURN", "SCRAP"]
        if v not in allowed:
            raise ValueError(f'movement_type doit être parmi {allowed}')
        return v

    @field_validator("MouvementStock__date", mode="before")
    def parse_date(cls, v):
        return parse(v) if isinstance(v, str) else v


PYDANTIC_MODELS = {
    "produit":   ProduitSchema,
    "categorie": CategorieSchema,
    "generer":   GenererSchema,
    "supplier":  SupplierSchema,
}