from __future__ import annotations

from typing import Optional, Set
from sqlalchemy.orm import Session
from models.bovino import Bovino


def codigo_bovino_existe(db: Session, codigo_bovino: Optional[int], exclude_id: Optional[int] = None) -> bool:
    if codigo_bovino is None:
        return False

    query = db.query(Bovino).filter(Bovino.codigo_bovino == int(codigo_bovino))
    if exclude_id is not None:
        query = query.filter(Bovino.id_bovino != int(exclude_id))
    return db.query(query.exists()).scalar()



def obtener_codigo_bovino_unico(
    db: Session,
    codigo_preferido: Optional[int] = None,
    exclude_id: Optional[int] = None,
    codigos_reservados: Optional[Set[int]] = None,
) -> int:
    reservados = set(codigos_reservados or set())

    if codigo_preferido is not None:
        codigo_preferido = int(codigo_preferido)
        if codigo_preferido not in reservados and not codigo_bovino_existe(db, codigo_preferido, exclude_id=exclude_id):
            return codigo_preferido

    ultimo_codigo = db.query(Bovino.codigo_bovino).filter(Bovino.codigo_bovino.isnot(None)).order_by(Bovino.codigo_bovino.desc()).first()
    siguiente = int(ultimo_codigo[0]) + 1 if ultimo_codigo and ultimo_codigo[0] is not None else 1

    while siguiente in reservados or codigo_bovino_existe(db, siguiente, exclude_id=exclude_id):
        siguiente += 1

    return siguiente
