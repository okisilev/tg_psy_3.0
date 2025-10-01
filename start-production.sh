#!/bin/bash

###############################################################################
# Скрипт запуска бота в продакшене
# Запускает PageKite туннель и Telegram бота
###############################################################################

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Директория проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Файлы для хранения PID процессов
PAGEKITE_PID_FILE="$PROJECT_DIR/pagekite.pid"
BOT_PID_FILE="$PROJECT_DIR/bot.pid"

# Лог файлы
LOG_DIR="$PROJECT_DIR/logs"
PAGEKITE_LOG="$LOG_DIR/pagekite.log"
BOT_LOG="$LOG_DIR/bot.log"

# Создаем директорию для логов
mkdir -p "$LOG_DIR"

###############################################################################
# Функции
###############################################################################

# Проверка что процесс запущен
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Остановка процесса
stop_process() {
    local pid_file=$1
    local name=$2
    
    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        echo -e "${YELLOW}Останавливаем $name (PID: $pid)...${NC}"
        kill "$pid"
        sleep 2
        
        # Если не остановился, убиваем принудительно
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}Принудительная остановка $name...${NC}"
            kill -9 "$pid"
        fi
        
        rm -f "$pid_file"
        echo -e "${GREEN}✓ $name остановлен${NC}"
    else
        echo -e "${YELLOW}$name не запущен${NC}"
    fi
}

# Запуск PageKite
start_pagekite() {
    echo -e "${GREEN}Запуск PageKite туннеля...${NC}"
    
    # Проверяем что pagekite.py существует
    if [ ! -f "$PROJECT_DIR/pagekite.py" ]; then
        echo -e "${RED}✗ Файл pagekite.py не найден!${NC}"
        echo -e "${YELLOW}Скачайте его: wget https://pagekite.net/pk/pagekite.py${NC}"
        exit 1
    fi
    
    # Запускаем PageKite в фоне
    nohup python3 "$PROJECT_DIR/pagekite.py" 3000 dashastar.pagekite.me \
        >> "$PAGEKITE_LOG" 2>&1 &
    
    PAGEKITE_PID=$!
    echo $PAGEKITE_PID > "$PAGEKITE_PID_FILE"
    
    echo -e "${GREEN}✓ PageKite запущен (PID: $PAGEKITE_PID)${NC}"
    echo -e "${GREEN}  Лог: $PAGEKITE_LOG${NC}"
    
    # Даем время на инициализацию туннеля
    sleep 3
}

# Запуск бота
start_bot() {
    echo -e "${GREEN}Запуск Telegram бота...${NC}"
    
    # Проверяем что .env существует
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        echo -e "${RED}✗ Файл .env не найден!${NC}"
        echo -e "${YELLOW}Создайте файл .env на основе env.example${NC}"
        exit 1
    fi
    
    # Проверяем что node_modules установлены
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        echo -e "${YELLOW}Устанавливаем зависимости...${NC}"
        npm install
    fi
    
    # Запускаем бота в фоне
    nohup node "$PROJECT_DIR/bot.js" >> "$BOT_LOG" 2>&1 &
    
    BOT_PID=$!
    echo $BOT_PID > "$BOT_PID_FILE"
    
    echo -e "${GREEN}✓ Бот запущен (PID: $BOT_PID)${NC}"
    echo -e "${GREEN}  Лог: $BOT_LOG${NC}"
}

# Проверка статуса
status() {
    echo -e "${GREEN}=== Статус сервисов ===${NC}"
    
    if is_running "$PAGEKITE_PID_FILE"; then
        local pid=$(cat "$PAGEKITE_PID_FILE")
        echo -e "${GREEN}✓ PageKite работает (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ PageKite не запущен${NC}"
    fi
    
    if is_running "$BOT_PID_FILE"; then
        local pid=$(cat "$BOT_PID_FILE")
        echo -e "${GREEN}✓ Telegram бот работает (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ Telegram бот не запущен${NC}"
    fi
}

# Остановка всех процессов
stop_all() {
    echo -e "${YELLOW}Остановка всех сервисов...${NC}"
    stop_process "$BOT_PID_FILE" "Telegram бот"
    stop_process "$PAGEKITE_PID_FILE" "PageKite"
}

# Перезапуск
restart() {
    stop_all
    sleep 2
    start_all
}

# Запуск всех процессов
start_all() {
    # Проверяем что не запущены уже
    if is_running "$PAGEKITE_PID_FILE"; then
        echo -e "${YELLOW}PageKite уже запущен${NC}"
    else
        start_pagekite
    fi
    
    if is_running "$BOT_PID_FILE"; then
        echo -e "${YELLOW}Бот уже запущен${NC}"
    else
        start_bot
    fi
    
    echo ""
    status
    echo ""
    echo -e "${GREEN}=== Полезные команды ===${NC}"
    echo -e "Статус:     ${YELLOW}./start-production.sh status${NC}"
    echo -e "Остановка:  ${YELLOW}./start-production.sh stop${NC}"
    echo -e "Перезапуск: ${YELLOW}./start-production.sh restart${NC}"
    echo -e "Логи бота:  ${YELLOW}tail -f $BOT_LOG${NC}"
    echo -e "Логи tunnel:${YELLOW}tail -f $PAGEKITE_LOG${NC}"
}

# Просмотр логов
logs() {
    local service=$1
    
    if [ "$service" == "bot" ]; then
        tail -f "$BOT_LOG"
    elif [ "$service" == "pagekite" ]; then
        tail -f "$PAGEKITE_LOG"
    else
        echo -e "${GREEN}Логи бота:${NC}"
        tail -n 20 "$BOT_LOG"
        echo ""
        echo -e "${GREEN}Логи PageKite:${NC}"
        tail -n 20 "$PAGEKITE_LOG"
    fi
}

###############################################################################
# Основная логика
###############################################################################

case "$1" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    *)
        echo -e "${GREEN}Использование: $0 {start|stop|restart|status|logs}${NC}"
        echo ""
        echo "Команды:"
        echo "  start   - Запустить все сервисы"
        echo "  stop    - Остановить все сервисы"
        echo "  restart - Перезапустить все сервисы"
        echo "  status  - Проверить статус сервисов"
        echo "  logs    - Показать логи (logs bot или logs pagekite)"
        exit 1
        ;;
esac

exit 0

