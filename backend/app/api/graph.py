from fastapi import APIRouter

router = APIRouter()

@router.get("/graph")
def test():
    return{
        "Hello world",
    }
