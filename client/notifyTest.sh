#!/bin/bash

pkill -f node	# kill previous server/client instances
# rm stat.txt		# clear previous stats

for (( c=0; c<5; c++ ))
do  
    printf "Starting client %d to do random read/write\n" "$c"
	node stresstest.js ${c} >> stat5.txt &
	sleep 3
done

# pkill -f node
cat stat5.txt
