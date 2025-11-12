from fastapi import FastAPI
from app.api import predict, graph, explain, llm, models

app = FastAPI(title="ICD Auto Coder Backend")

app.include_router(predict.router, prefix="/predict", tags=["Predict"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(llm.router, prefix="/llm", tags=["llm"])
app.include_router(models.router, prefix="models", tags=["models"])
app.include_router(explain.router, prefix="explain", tags=["explain"])