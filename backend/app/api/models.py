from fastapi import APIRouter

router = APIRouter()

@router.get("/models")
def test():
    return{
        "Hello world",
    }
