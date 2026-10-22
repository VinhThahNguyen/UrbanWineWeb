package com.urbanwine.sell_wine_express;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BanWineExpressApplication {

	public static void main(String[] args) {
		SpringApplication.run(BanWineExpressApplication.class, args);
	}

}
