package config

import "github.com/spf13/viper"

type Config struct {
	Port           int
	AllowedOrigins []string
	DataDir        string
}

func Load() (*Config, error) {
	viper.SetDefault("port", 5001)
	viper.SetDefault("allowed_origins", []string{"http://127.0.0.1:3000", "http://localhost:3000"})
	viper.SetDefault("data_dir", ".data")
	viper.AutomaticEnv()
	return &Config{
		Port:           viper.GetInt("port"),
		AllowedOrigins: viper.GetStringSlice("allowed_origins"),
		DataDir:        viper.GetString("data_dir"),
	}, nil
}
