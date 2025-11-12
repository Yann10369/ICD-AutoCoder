from fastapi import APIRouter

router = APIRouter()

@router.get("/predict")
def test():
    return{
        "Hello world",
    }
