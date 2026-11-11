import asyncio
import sys
import uuid

from modal.client import _Client
from modal._utils.task_command_router_client import TaskCommandRouterClient
from modal.container_process import _ContainerProcess
from modal._utils.async_utils import synchronizer
from modal_proto import task_command_router_pb2 as router


async def main():
    task = sys.argv[1]
    client = await _Client.from_env()
    connection = await TaskCommandRouterClient.init(client, task)
    pid = str(uuid.uuid4())
    command = "ls -lah /root/.cache/huggingface/hub/models--Comfy-Org--MiniMax-H3/blobs; du -sh /root/.cache/huggingface/*; find /root/.cache/huggingface -maxdepth 5 -name '*.incomplete' -ls; ps -eo pid,etime,comm"
    await connection.exec_start(router.TaskExecStartRequest(
        task_id=task, exec_id=pid, command_args=["sh", "-c", command],
        stdout_config=router.TaskExecStdoutConfig.TASK_EXEC_STDOUT_CONFIG_PIPE,
        stderr_config=router.TaskExecStderrConfig.TASK_EXEC_STDERR_CONFIG_PIPE))
    process = _ContainerProcess(pid, task, client, connection)
    for output in await asyncio.gather(process.stdout.read(), process.stderr.read()):
        print(output)
    print("exit:", await process.wait())


synchronizer.create_blocking(main)()
