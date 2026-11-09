package com.kotonohamachi.resident.repository;

import com.kotonohamachi.resident.Resident;
import org.springframework.data.jpa.repository.JpaRepository;

/** 주민 정보에 접근한다. */
public interface ResidentRepository extends JpaRepository<Resident, Long> {}
