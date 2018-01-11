import string
import os

region = [',VT']

def ddtoco(dd):
	degree = '{:03.0f}'.format(int(dd))
	ddmin  = dd-int(dd)
	minute = '{:02.0f}'.format(int(ddmin*60))
	ddsec  = (ddmin*60)-int(ddmin*60)
	second = '{:02.0f}'.format(int(ddsec*60))
	deci = '{:03d}'.format(int(((ddsec*60)-int(ddsec*60))*1000))
	result = degree + "." + minute + "." + second + "." + deci 
	return result

with open('Waypoints.txt') as oldfile, open('TH.txt', 'w') as newfile:
    for line in oldfile:
        if any(country in line for country in region):
            newfile.write(line)

with open('TH.txt') as oldfile, open('02-THAI.txt', 'w') as newfile:
	for line in oldfile:
		data = line.split(",")
		fix_name = '{:5}'.format(data[0])
		co_n = ddtoco(float(data[1]))
		co_e = ddtoco(float(data[2]))
		output = fix_name + " N" + co_n + " E" + co_e + "\n"
		newfile.write(output)
