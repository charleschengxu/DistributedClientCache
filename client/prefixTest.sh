#!/bin/bash

pkill -f node	# kill previous server/client instances
rm stat.txt		# clear previous stats

for (( p=3; p<=3; p+=2 ))
do  
	printf "============== prefix length = %d ==============\n" "$p" >> stat.txt
	for (( i=5; i<=25; i+=5 ))
	do  
		# restart server cold
		../bin/www ${p}&
		echo "Restart Server To Clear KVStore"
		sleep 1
		# spin up listeners
	    for (( c=0; c<i; c++ ))
		do  
		    printf "Starting client %d to do random read/write, total clients = %d\n" "$c" "$i"
			node stresstest.js ${c}&
			sleep $((c / 6 + 3))
		done
		printf "total clients = %d\n" "$i" >> stat.txt
		curl "http://localhost:3000/api/stat" >> stat.txt
		echo >> stat.txt
		pkill -f node
	done
done

# pkill -f node
cat stat.txt
