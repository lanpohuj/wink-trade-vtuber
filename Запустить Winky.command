#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR" || exit 1
export PYTHONPATH="$DIR:$PYTHONPATH"
echo "Запуск Winky VTuber Агента..."
exec "$DIR/.venv/bin/python" -m winky.app
