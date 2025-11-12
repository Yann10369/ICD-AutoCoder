from fastapi import APIRouter

router = APIRouter()

@router.get("/llm")
def test():
    return{
        "Hello world",
    }
