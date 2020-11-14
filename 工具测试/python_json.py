# 这是用于序列化的两个模块：

# json: 用于字符串和python数据类型间进行转换
# pickle： 用于python特有的类型和python的数据类型间进行转换
# Json模块提供了四个功能：dumps、dump、loads、load

# pickle模块提供了四个功能：dumps、dump、loads、load

1 with open("../config/record.json","w") as f:
2     json.dump(new_dict,f)
3print("加载入文件完成...")

1 new_dict = json.loads(json_str)
2 print(new_dict)
3print(type(new_dict))

1 import json
2 
3 test_dict = {'bigberg': [7600, {1: [['iPhone', 6300], ['Bike', 800], ['shirt', 300]]}]}
4 print(test_dict)
5 print(type(test_dict))
6 #dumps 将数据转换成字符串
7 json_str = json.dumps(test_dict)
8 print(json_str)
9 print(type(json_str))

# json dumps把数据类型转换成字符串 dump把数据类型转换成字符串并存储在文件中  loads把字符串转换成数据类型  load把文件打开从字符串转换成数据类型

# json是可以在不同语言之间交换数据的，而pickle只在python之间使用。json只能序列化最基本的数据类型，josn只能把常用的数据类型序列化（列表、字典、列表、字符串、数字、），比如日期格式、类对象！josn就不行了。而pickle可以序列化所有的数据类型，包括类，函数都可以序列化。

with open("../config/record.json", 'r') as load_f:
    load_dict = json.load(load_f)
    print(load_dict)
load_dict['smallberg'] = [8200, {1: [['Python', 81], ['shirt', 300]]}]
print(load_dict)

with open("../config/record.json", "w") as dump_f:
    json.dump(load_dict, dump_f)
