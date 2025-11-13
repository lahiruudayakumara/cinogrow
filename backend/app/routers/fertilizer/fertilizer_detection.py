from fastapi import APIRouter

router = APIRouter(tags=['fertilizer-detection'])

@router.get('/test')
async def test():
    return {'message': 'Test successful'}
