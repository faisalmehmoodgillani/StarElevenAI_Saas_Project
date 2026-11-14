from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.agent_schema import (
    AgentConfigCreateRequest,
    AgentConfigResponse,
)
from backend.services.tenant_service import create_agent_configuration, list_workspace_agent_configs, delete_workspace_api_key  

router = APIRouter(prefix="/agents", tags=["Agent Configurations"])

@router.get("/{workspace_id}")
def get_workspace_agents(workspace_id: str, db: Session = Depends(get_db)):
    try:
        return {"configs": list_workspace_agent_configs(db, workspace_id)}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("", response_model=AgentConfigResponse)
def register_agent_config(payload: AgentConfigCreateRequest, db: Session = Depends(get_db)):
    """Creates a workspace agent configuration with AES-256 encrypted API key storage."""
    try:
        return create_agent_configuration(
            db=db,
            workspace_id=payload.workspace_id,
            agent_type=payload.agent_type,
            provider=payload.provider,
            model_name=payload.model_name,
            plain_api_key=payload.api_key,
            settings_json=payload.settings_json,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent config: {str(e)}")

@router.delete("/{workspace_id}/keys/{config_id}")
def remove_workspace_vault_key(
    workspace_id: str,
    config_id: str,
    db: Session = Depends(get_db),
):
    try:
        return delete_workspace_api_key(db, workspace_id, config_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))