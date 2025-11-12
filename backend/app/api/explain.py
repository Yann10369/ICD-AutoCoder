from fastapi import APIRouter

router = APIRouter()

@router.get("/explain")
def test():
    return{
        "Hello world",
    }
