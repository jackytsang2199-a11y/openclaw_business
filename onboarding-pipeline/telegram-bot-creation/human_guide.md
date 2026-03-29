#Fill bot
python replenish_bots.py --start 1043 --count 20

#copy bot to pi5
scp C:/Users/User/bot-pool/available/*.token jacky999@192.168.1.30:~/bot-pool/available/
